import {defs, tiny} from './examples/common.js';
import {Text_Line} from "./examples/text-demo.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

export class GolfBallFantasy extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            cube: new defs.Cube,
            text: new Text_Line(35),
            pole_base: new defs.Capped_Cylinder(10,100,[[0, 1], [0,1]]),
            flag: new defs.Rounded_Closed_Cone(20,100,[[0, 1], [0,1]]),

        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test2: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            ring: new Material(new Ring_Shader()),
            test3: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: hex_color("#99c0df")}),
            golf_ball: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: 0, specularity: 0, color: hex_color("#ffffff")}),
            pole: new Material(new defs.Phong_Shader(),
                {ambient: .7, diffusivity: .7, specularity: 0, color: hex_color("#ffffff")}),
            flag: new Material(new defs.Phong_Shader(),
                {ambient: .5, diffusivity: .7, specularity: 0, color: hex_color("#ffffff")}),
            golf_head: new Material(new Texture_Rotate(),
                {
                    color: color(0, 0, 0, 1),
                    ambient: 1, diffusivity: .1, specularity: .0,
                    texture: new Texture("assets/stars.png", "NEAREST") // Texture class
                }),
            golf_stick: new Material(new defs.Textured_Phong(),
                {ambient:1 , color: hex_color("808080")}),
        }

        this.ground_color = hex_color("#9ef581");

        // From examples/text-demo.js
        const texture = new defs.Textured_Phong(1);
        // To show text you need a Material like this one:
        this.text_image = new Material(texture, {
            ambient: 1, diffusivity: 0, specularity: 0,
            texture: new Texture("assets/text.png")
        });

        this.launch_time = 0;
        this.golf_ball_position = Mat4.identity();
        this.golf_ball_position = this.golf_ball_position.times(Mat4.translation(-20, 0, 0));
        this.initial_fall = 0;
        this.current_golf_ball_position = Mat4.identity();

        this.golf_ball_velocity = {x: 0, y: 0};
        this.golf_ball_acceleration = {x: 0, y: -9.8};
        this.golf_ball2_transform = Mat4.translation(12,-2,0);
        this.hit_plane_count = 0;

        // this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));

    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Pause golf club", ["v"], () => this.program_state.animate ^= 1);
        this.key_triggered_button("Release golf club", ['b'], () => this.release ^= 1);
        this.key_triggered_button("Speed up", ['g'], () => this.speedUp());
    }

    /*  @para: v: float  (hopefully) the initial horizontal speed of the object
               t0: float    initial time
               t: float  (hopefully) program_state.animation_time / 1000
               initial_transform: Mat4     The transformation matrix of the initial position of the object
        @return: proj_transform: Mat4      The transformation matrix in the projectile motion
   */
    projectile_transform(v, t0, t, initial_transform) {
        let delta_t = t - t0;
        let x_displacement = v * delta_t;
        let y_displacement = -0.5 * 9.8 * delta_t * delta_t;
        // console.log(x_displacement, y_displacement);
        let proj_transform = Mat4.translation(x_displacement, y_displacement, 0).times(initial_transform);
        // console.log(cube_pos[1]);
        return proj_transform;
    }

    x_distance(transform1, transform2) {
        //let x_distance = transform2.x - transform1.x;
        let x_distance = transform2.times(vec4(0,0,0,1))[0] - transform1.times(vec4(1,0,0,1))[0];
        //let z_distance = transform2.z - transform1.z;
        return x_distance;
    }

    y_distance(transform1, transform2) {
        //let x_distance = transform2.x - transform1.x;
        let y_distance = transform2.times(vec4(0,-1,0,1))[1] - transform1.times(vec4(0,1,0,1))[1];
        //let z_distance = transform2.z - transform1.z;
        return y_distance;
    }

    stay_on_ground(transform){
        transform[1] = transform.times(vec4(0,-1,0,1))[1];
        return transform;
    }

    // The displacement of the golf ball in time dt, update this.golf_ball_velocity
    // para: dt
    // read this.golf_ball_velocity, this.golf_ball_acceleration; write to this.golf_ball_velocity
    delta_displacement(dt) {
        // const v_0x = this.golf_ball_velocity.x, v_0y = this.golf_ball_velocity.y;
        // const a_x = this.golf_ball_acceleration.x, a_y = this.golf_ball_acceleration.y;
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
        const {x: v_0x, y: v_0y} = this.golf_ball_velocity;
        const {x: a_x, y: a_y} = this.golf_ball_acceleration;

        const v_tx = v_0x + a_x * dt, v_ty = v_0y + a_y * dt;
        const dx = (v_0x + v_tx)/2 * dt, dy = (v_0y + v_ty)/2 * dt;
        this.golf_ball_velocity = {x: v_tx, y: v_ty};
        // console.log(this.golf_ball_velocity, dx, dy);
        return {dx, dy};
    }

    // Determine if a point (x, y) is in the line segment between (x1, y1) and (x2, y2)
    onLine(x, y, x1, y1, x2, y2) {
        const error = 0.7;
        const slope_diff = (y-y1)*(x2-x1) - (y2-y1)*(x-x1);
        const isOnLine = (slope_diff <= 0) && (Math.abs(slope_diff) <= error);
        // console.log(x, y, x1, y1, x2, y2, isOnLine);
        return isOnLine;
    }

    /*
    Determine if the golf ball is on a plane in scene 2
    It is on the plane if (the golf ball center's y-coor - r) is on the plane
    Like:           ____
                   /    \
           -------|  x  |-------------------
                  \    /                   | r
            ======== plane =============== -
    */
    onPlane(golf_ball_transform, golf_ball_radius, plane_transform) {
        const golf_ball_center = golf_ball_transform.times(vec4(0,0,0,1));
        const plane_l = plane_transform.times(vec4(-1,1,0,1)),
              plane_r = plane_transform.times(vec4(1,1,0,1));
        return this.onLine(golf_ball_center[0], golf_ball_center[1]-golf_ball_radius,
                            plane_l[0], plane_l[1], plane_r[0], plane_r[1]);
    }

    // Check if the golf ball is on the right of the scene 2 platform
    // by checking if the ball bottom is to the lower left of the upper right corner of the platform
    // May not be accurate.
    onScene2Platform(golf_ball_radius, platform_transform) {
        const error = 0.5;
        const golf_ball_center = this.current_golf_ball_position.times(vec4(0,0,0,1));
        const platform_ur = platform_transform.times(vec4(1,1,0,1));
        // this.isOnPlatform =  golf_ball_center[0] <= platform_ur[0] && (golf_ball_center[1] - golf_ball_radius) <= platform_ur[1];
        if (golf_ball_center[0] <= platform_ur[0]) {
            const golf_ball_bottom = golf_ball_center[1] - golf_ball_radius;
            if (platform_ur[1] - golf_ball_bottom >= 0 && platform_ur[1] - golf_ball_bottom <= error) {
                return true;
            }
        }
        return false;
    }

    speedUp() {
        // When the key g is pressed, increase the horizontal velocity by a certain amount
        if (this.hit_plane_count === 6)
            this.golf_ball_velocity.x -= .6;
    }

    draw_ground(context, program_state) {
        // The ground for scene 1
        let ground1_transform = Mat4.translation(-10, -2, 0).times(Mat4.scale(20, 1, 1));
        this.shapes.cube.draw(context, program_state, ground1_transform, this.materials.test.override({color: this.ground_color}));
        let ground2_transform = Mat4.translation(20,-2,0).times(Mat4.scale(7, 1, 1));
        this.shapes.cube.draw(context, program_state, ground2_transform, this.materials.test.override({color: this.ground_color}));
        // console.log(ground1_transform.times(vec4(-1,1,1,1)), ground1_transform.times(vec4(1,1,1,1)),
        //             ground1_transform.times(vec4(1,-1,1,1)), ground1_transform.times(vec4(1,1,1,1)),
        //             ground2_transform.times(vec4(-1,1,1,1)), ground2_transform.times(vec4(1,1,1,1)));
        return ground1_transform;
    }

    draw_golf_ball(context, program_state){
        // Our lil stationary Golf Ball
        this.shapes.sphere.draw(context, program_state, this.golf_ball_position, this.materials.golf_ball);
    }

    draw_golf_ball_moving(context, program_state, t, platform_transform) {
        // Our lil moving Golf Ball
        let golf_color = hex_color("#ffffff");
        let golf_velocity = 3;
        let golf_ball_transform = Mat4.identity();
        golf_ball_transform = this.golf_ball_position.times(Mat4.translation(t*golf_velocity-(2.5*golf_velocity), 0, 0));
        if(this.y_distance(platform_transform, golf_ball_transform) > 0 || this.x_distance(platform_transform, golf_ball_transform) >= 0){
            let delta_t = t-this.initial_fall;
            let gravity = -0.5*9.8*delta_t*delta_t;
            golf_ball_transform = this.golf_ball_position.times(Mat4.translation(t*golf_velocity-(2.5*golf_velocity), gravity, 0));
        }
        else{
            this.initial_fall = t;
        }

        // console.log(this.y_distance(platform_transform, golf_ball_transform));
        this.shapes.sphere.draw(context, program_state, golf_ball_transform, this.materials.golf_ball);
        console.log(golf_ball_transform);
        return golf_ball_transform;
    }
    
    draw_golf_clubs(context, program_state, angle) {
        let golf_club_transform = Mat4.identity();
        let stick = golf_club_transform.times(Mat4.translation(-21.2, 10, -1))
            .times(Mat4.translation(.2, 10, 0))
            .times(Mat4.rotation(- angle, 0, 0, 1))
            .times(Mat4.translation(-.2, -10, 0))
            .times(Mat4.scale(.2, 10, .2));
        this.shapes.cube.draw(context, program_state, stick, this.materials.golf_stick);
        let head = stick.times(Mat4.translation(0, -1, 4))
            .times(Mat4.scale(1.2, .1, 5.5));
        this.shapes.sphere.draw(context, program_state, head, this.materials.golf_head);

     }

    draw_flag(context,program_state){
        //Red flag
        let flag_color = hex_color("#FF0000");
        let flag_transform = Mat4.identity();
        flag_transform=flag_transform.times(Mat4.translation(9.5,20.25,0)).times(Mat4.scale(5,3.75,.35)).times(Mat4.rotation(3*Math.PI/2,0,1,0));
        this.shapes.flag.draw(context,program_state,flag_transform,this.materials.flag.override({color: flag_color}));

    }

    draw_pole(context,program_state){
        //Sir Polio
        let pole_color = hex_color("#f4f0db");
        let pole_transform = Mat4.identity();
        pole_transform=pole_transform.times(Mat4.translation(15,12,0)).times(Mat4.scale(.5,27,.5)).times(Mat4.rotation(Math.PI/2,1,0,0));
        this.shapes.pole_base.draw(context,program_state,pole_transform,this.materials.pole.override({color: pole_color}));
        let flag_top_transform = Mat4.identity();
        flag_top_transform = flag_top_transform.times(Mat4.translation(15, 25, 0)).times(Mat4.scale(.8,.8,.8));
        this.shapes.sphere.draw(context, program_state, flag_top_transform, this.materials.pole.override({color: pole_color}));
        let pole_base_color = hex_color("#003200");
        let pole_base_transform = Mat4.identity();
        pole_base_transform=pole_base_transform.times(Mat4.translation(15,-1,0)).times(Mat4.scale(1,.5,1)).times(Mat4.rotation(Math.PI/2,1,0,0));
        this.shapes.pole_base.draw(context,program_state,pole_base_transform,this.materials.pole.override({color: pole_base_color}));
    }


    draw_game_over(context, program_state, tank_center_loc = [-30, -70, 0]) {
        // The game over scene
        let tank_transform = Mat4.translation(tank_center_loc[0], tank_center_loc[1], tank_center_loc[2]).times(Mat4.scale(30,10,1));
        let gg_transform = Mat4.translation(tank_center_loc[0], tank_center_loc[1], tank_center_loc[2]+1);
        this.shapes.text.set_string("GAME OVER", context.context);
        // Modeling a falling golf ball
        let golf_ball_transform = Mat4.translation(tank_center_loc[0]-5, tank_center_loc[1]+20, tank_center_loc[2]);
        // golf_ball_transform = this.projectile_transform(5, this.launch_time, program_state.animation_time / 1000, golf_ball_transform);
        golf_ball_transform = this.current_golf_ball_position;
        let cube2_transform = Mat4.translation(-50,-30,0);
        let cube3_transform = Mat4.translation(-55, -20, 0);
        // let cube4_initial_pos = vec4(-45, -10.5, 0.5);

        let water_lv = tank_transform.times(vec4(0,1,0,1))[1];
        let golf_ball_center_y = golf_ball_transform.times(vec4(0,0,0,1))[1];
        let is_show_text = (golf_ball_center_y <= water_lv);
        // console.log(golf_ball_center_y, water_lv, is_show_text);
        if (is_show_text)
            this.shapes.text.draw(context, program_state, gg_transform, this.text_image);

        // this.shapes.cube.draw(context, program_state, cube2_transform, this.materials.test.override({color: hex_color("#ffffff")}));
        // this.shapes.cube.draw(context, program_state, cube3_transform, this.materials.test);

        this.shapes.cube.draw(context, program_state, tank_transform, this.materials.test3);
        // this.shapes.sphere.draw(context, program_state, golf_ball_transform, this.materials.golf_ball);

    }

    // When hitting the first plane, the velocity changes to (-3.834, 3.834)
    // read and write to this.golf_ball_velocity
    hit_plane() {
        const v0 = Math.sqrt(2*9.8*6);
        const v1 = v0/(2*Math.sqrt(2.));
        this.golf_ball_velocity = {x: -1*v1, y: v1};
    }

    draw_scene2(context, program_state, dt) {
        // Draw the first plane
        let plane1_x = 12 + 1/Math.sqrt(2.), plane1_y = -8 - 1/Math.sqrt(2.);
        // console.log(plane1_x, plane1_y);
        let plane1_transform = Mat4.translation(plane1_x, plane1_y, 0).times(Mat4.rotation(Math.PI/4, 0,0,1)).times(Mat4.scale(2,.1,1));
        this.shapes.cube.draw(context, program_state, plane1_transform, this.materials.test);
        // Draw the other planes
        const plane_centers = [[6.7251, -13, 0], [1.4502, -17, 0], [-3.8248, -21, 0], [-9.1000, -25, 0], [-14.3746, -29, 0]];
        const plane_transforms = [plane1_transform];
        plane_centers.map(center => {
            // console.log(center);
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax
            let plane_transform = Mat4.translation(...center).times(Mat4.scale(2,.1,1));
            plane_transforms.push(plane_transform);
            this.shapes.cube.draw(context, program_state, plane_transform, this.materials.test);
        })
        // const golf_ball_pos = this.golf_ball2_transform.times(vec4(0,0,0,1));
        // const golf_ball_y = golf_ball_pos[1];
        // if (this.hit_plane_count === 0 && golf_ball_y <= -8) { // Time to hit plane 1
        //     this.hit_plane1();
        //     this.hit_plane_count += 1;
        //     console.log(golf_ball_pos);
        // }

        if (this.hit_plane_count < 6)
        {
            // Determine if the ball hits the plane
            let isOnPlane = this.onPlane(this.current_golf_ball_position, 1, plane_transforms[this.hit_plane_count]);
            if (isOnPlane) {
                // console.log("on plane", this.hit_plane_count + 1);
                this.hit_plane_count += 1;
                this.hit_plane();
            }
        }

        const {dx, dy} = this.delta_displacement(dt);
        this.current_golf_ball_position = Mat4.translation(dx, dy, 0).times(this.current_golf_ball_position);

        this.shapes.sphere.draw(context, program_state, this.current_golf_ball_position, this.materials.golf_ball);

        // Draw the platform
        const ground_transform = Mat4.translation(-32, -36, 0).times(Mat4.scale(8, 1, 1));
        this.shapes.cube.draw(context, program_state, ground_transform, this.materials.test.override({color: this.ground_color}));

        // Checking landing on the platform
        if (this.hit_plane_count === 6 && this.onScene2Platform(1, ground_transform)) {
            this.golf_ball_velocity.y = 0;
            this.golf_ball_acceleration.y = 0;

            // Drag the ball on the platform
            const platform_top_y = ground_transform.times(vec4(0,1,0,1))[1];
            const golf_ball_bottom_y = this.golf_ball2_transform.times(vec4(0,0,0,1))[1] - 1;
            this.golf_ball2_transform = Mat4.translation(0, platform_top_y - golf_ball_bottom_y, 0).times(this.golf_ball2_transform);
        }
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            // program_state.set_camera(this.initial_camera_location);
            program_state.set_camera(Mat4.translation(0, -10, -40));
            // program_state.set_camera(Mat4.translation(10, 40, -80)); // focus on the game over scene
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // this.shapes.[XXX].draw([XXX]) // <--example

        const light_position = vec4(0, 5, 5, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000),
                                // new Light(vec4(0, -5, 15, 1), color(1,1,1,1), 1000)
                                ];
        this.program_state = program_state;

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        const yellow = hex_color("#fac91a");
        let model_transform = Mat4.identity();

        let gravity = -0.5*9.8*t*t;
        
        const max_angle = .5 * Math.PI;
        let a = max_angle/2;
        let b = a;
        let w = 0.6 * Math.PI;
        let angle = a + b * Math.sin(w * t);

        // this.shapes.torus.draw(context, program_state, model_transform, this.materials.test.override({color: yellow}));

        // Draw the ground of scene 1

        const ground1_transform = this.draw_ground(context, program_state);
        //this.draw_golf_ball(context, program_state);
        if (t < 2.5) {
            this.draw_golf_ball(context, program_state);
            this.draw_golf_clubs(context, program_state, angle);
        }
        else if(t < 13){
            this.current_golf_ball_position = this.draw_golf_ball_moving(context, program_state, t, ground1_transform);
            this.draw_golf_clubs(context, program_state, 0);
        }

        this.draw_pole(context,program_state);
        this.draw_flag(context,program_state);


        // Projectile motion
        let cube_transform = Mat4.translation(-5,20,0);
        let speed = 5.0; // unit/sec
        let proj_transform = this.projectile_transform(speed, this.launch_time, t, cube_transform);
        // ↓↓↓ Comment this out to get rid of the falling cube ↓↓↓
        // this.shapes.cube.draw(context, program_state, proj_transform, this.materials.test);
        let obj_pos = proj_transform.times(vec4(0,0,0,1));
        if (obj_pos[1] < -2) {    // If y-coor of the object is less than -2, then relaunch the object in the initial position
            this.launch_time = t;
        }
        if (t > 13)
            this.draw_scene2(context, program_state, dt, this.current_golf_ball_position);

        // Temporarily draw the game over scene
        this.draw_game_over(context, program_state);

    }
}

/*
    Check if a point is inside the sphere
 */
function inSphere(p, center, radius) {
    return (p[0] - center[0])**2 + (p[1] - center[1])**2 + (p[2] - center[2])**2 <= radius**2;
}


class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                // Compute an initial (ambient) color:
                gl_FragColor = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Texture_Rotate extends defs.Textured_Phong {
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            void main(){
                // Sample the texture image in the correct place:
                
                // cube 1: 15rpm
                // 15 * 2pi / 60 = 1/2 * pi rad/s = 1/2 * 3.1415926
                
                // rotation speed is .5
                // mod 4. to complete one cycle
                float angle = .5 * 3.1415926 * mod(animation_time, 4.);
                mat4 rot_mat = mat4(
                    vec4(cos(angle), -sin(angle), 0., 0.),
                    vec4(sin(angle), cos(angle), 0., 0.),
                    vec4(0., 0., 1., 0.),
                    vec4(0., 0., 0., 1.)
                );
                
                // rotate
                // pad zero
                vec4 f_tex_vec4 = vec4(f_tex_coord, 0., 0.);
                f_tex_vec4 += vec4(-.5, -.5, 0., 0.);
                f_tex_vec4 = rot_mat * f_tex_vec4;
                f_tex_vec4 += vec4(.5, .5, 0., 0.);
                
                vec2 f_tex_coord = vec2(f_tex_vec4.x, f_tex_vec4.y);
                vec4 tex_color = texture2D( texture, f_tex_coord );
                
                
                float bx = mod(f_tex_coord.x, 1.);
                float by = mod(f_tex_coord.y, 1.);
                if ((bx >= 0.15 && bx <= 0.85 && by >= 0.15 && by <= 0.25)
                    || (bx >= 0.15 && bx <= 0.85 && by >= 0.75 && by <= 0.85)
                    || (bx >= 0.15 && bx <= 0.25 && by >= 0.15 && by <= 0.85)
                    || (bx >= 0.75 && bx <= 0.85 && by >= 0.15 && by <= 0.85)
                ) tex_color = vec4(0., 0., 0., 1.);
                 
                if ( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
          
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
          
        }`;
    }
}

