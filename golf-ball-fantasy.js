import {defs, tiny} from './examples/common.js';
import {Text_Line} from "./examples/text-demo.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture,
} = tiny;

const {Textured_Phong} = defs

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
            axis:new defs.Axis_Arrows(),
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            test2: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            ring: new Material(new Ring_Shader()),
            test3: new Material(new Ring_Shader(),
                {ambient: 1, color: hex_color("#88ccff")}),
            test4: new Material(new defs.Phong_Shader(),
                {ambient: 0.8, diffusivity: .6, color: hex_color("#ffffff")}),
            golf_ball: new Material(new Textured_Phong(), {
                color: hex_color("#ffffff"),
                ambient: 0.5, diffusivity: 0, specularity: 0,
                texture: new Texture("assets/golf_ball.jpg", "NEAREST")
            }),
            pole: new Material(new defs.Phong_Shader(),
                {ambient: .7, diffusivity: .7, specularity: 0, color: hex_color("#ffffff")}),
            flag: new Material(new defs.Phong_Shader(),
                {ambient: .5, diffusivity: .7, specularity: 0, color: hex_color("#ffffff")}),
            cloud: new Material(new Textured_Phong(1),
                {ambient: 1, diffusivity: 0.9, specularity: 0,
                    texture: new Texture("assets/cloud.jpg", "NEAREST")}),
            grass: new Material(new Textured_Phong(1),
                {ambient: 1, diffusivity: 0.9, specularity: 0,
                    texture: new Texture("assets/grass.jpg", "NEAREST")}),
            underground: new Material(new Textured_Phong(1),
                {ambient: 1, diffusivity: 0.9, specularity: 0,
                    texture: new Texture("assets/underground.png", "NEAREST")}),
            celling: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: .1, color: hex_color("1B0000")}),
            golf_head: new Material(new defs.Phong_Shader(),
                {ambient: 1, diffusivity: .1, color: hex_color("9E9E9E")}),
            golf_stick: new Material(new defs.Phong_Shader(),
                {ambient:1 , color: hex_color("808080")}),
            wood: new Material(new defs.Textured_Phong(1),
                {ambient: 1, diffusitivity: .5, smoothness: 50, color:hex_color("000000"),
                    texture: new Texture("assets/wood.jpeg", "NEAREST")}),
            plastic: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#ffffff")}),
            metal: new Material(new Gouraud_Shader(),
                {diffusivity: .2, specularity: 1, color: hex_color('#80FFFF')}),
            gg: new Material(new defs.Textured_Phong(1), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.9, specularity: 0,
                texture: new Texture("assets/ggCandara2.png", "NEAREST")
            }),
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
        this.golf_ball_position = this.golf_ball_position.times(Mat4.translation(-35, 0, 0));
        this.initial_fall = 0;
        this.current_golf_ball_position = this.golf_ball_position;
        this.hit_time = 0;
        this.swing_angle = -1;

        this.golf_ball_velocity = {x: 0, y: 0};
        this.golf_ball_acceleration = {x: 0, y: 0};
        this.golf_ball2_transform = Mat4.translation(12,-2,0);
        this.hit_plane_count = 0;
        this.is_stopped = false;
        this.is_bounced = false;
        this.inHole = false;
        this.scene2Cam = false;
        this.splash = false;
        this.splashx = 0;
        this.splashy = 0;
        this.initial_splash = 0;

        this.camera_on_ball = 0;

        // golf_club_material
        this.m_index = 0;
        this.damping = 0;

        // bottons control
        this.lift = 0;
        this.release = 0;

        // golf_club
        this.golf_club_model = Mat4.identity();
        this.golf_club_model = this.golf_club_model.times(Mat4.translation(-36.4, 10, -1))
            .times(Mat4.scale(.2, 10, .2));
        this.golf_head_model = Mat4.identity();
        this.club_angle = 0;
        this.reachesMax = 0;
        this.velocity = 0;
        this.isHit = 0;

        // dominoes
        this.domino_dimension = {x: 1, y: 6, z: 3};
        this.domino_distance = 4;
        this.dominoes = [0,1,2,3,4,5,6,7].map((n) => {
            const center = {x: -39.5 - n*this.domino_distance, y: -32, z: 0};
            return {
                "center": center,
                "transform": Mat4.translation(center.x, center.y, center.z).times(Mat4.scale(this.domino_dimension.x/2, this.domino_dimension.y/2, this.domino_dimension.z/2)),
                // "is_falling": false,
                // "is_collided": false,  // If the domino collided with the right one or the button
                // "is_fallen": false,
                "state": "sit still", // states include "sit still", "fall" (after hit by the right domino), and "collided" (with the left domino)
                "angular_speed": 0.0,
                // "angular_acceleration": 0.0,
                "rotation_angle": 0.0,
            };
        });
        this.button_loc = {x: -74, y: -34, z:0};
        console.log(this.dominoes);

        this.you_win = false;

        // this.black_px = [[2,14],[2,15],[2,26],[2,27],[3,14],[3,15],[3,26],[3,27],
        // [4,16],[4,17],[4,24],[4,25],[5,16],[5,17],[5,24],[5,25],[6,18],[6,19],[6,22],[6,23],
        // [7,18],[7,19],[7,22],[7,23],[7,33],[7,34],[7,35],[7,36],[7,44],[7,45],[7,51],[7,52],
        // ]
        this.yellow_px = [[1,14],[1,15],[1,16],[1,17],[1,26],[1,27],[1,28],[1,29],
            [2,14], [2,17], [2,26], [2,29], [3,14],[ 3,17], [3,18], [3,19], [3,24], [3,25], [3,26], [3,29],
            [4, 14], [4,15], [4,16],[4,19],[4,24],[4,27],[4,28],[4,29],
            [5,16], [5,19],[5,20],[5,23],[5,24],[5,27], [6,16], [6,17], [6,18],[6,21], [6,22],[6,25],[6,26],[6,27],
            [7,18],[7,25],[8,18],[8,19],[8,20],[8,23],[8,24],[8,25],
            [9,20],[9,23],[10,20],[10,23],[11,20],[11,23],[12,20],[12,23],
            [13,20],[13,23],[14,20],[14,23],[15,20],[15,23],[16,20],[16,23],[17,20],[17,23],
            [18,18],[18,19],[18,20],[18,23],[29,28],[29,29],[29,30], [29,31],
            [30,28],[30,31],[31,28],[31,31],[32,28],[32,31],[33,28],[33,31],[34,28],[34,31],
            [35,28],[35,31],[36,28],[36,31],[37,28],[37,31],[38,28],[38,31],[39,28],[39,31],
            [40,28],[40,31],[41,28],[41,31],[42,28]];
        this.red_px = [[5,44],[5,45],[5,46],[5,47],[5,51],[5,52],[5,53],[5,54],
            [6,44],[6,47],[6,51],[6,54],[7,44],[7,47],[7,51],[7,54],[8,44],[8,47],[8,51],[8,54],
            [9,44],[9,47],[9,51],[9,54],[10,44],[10,47],[10,51],[10,54],[11,44],[11,47],[11,51],[11,54],
            [12,44],[12,47],[12,51],[12,54],[13,44],[13,47],[13,51],[13,54],[13,44],[13,47],[13,51],[13,54],
            [14,44],[14,47],[14,51],[14,54],[15,44],[15,47],[15,51],[15,54],
            [16,44],[16,47],[16,18], [16,49], [16,50], [16,51],[16,54], [17,45], [17,53], [17,54],
            [18,40], [18,41],[18,40], [18,42],[18,43], [18,44],[18,45], [18,46],[18,47], [18,48],[18,49], [18,50],
            [18,51],[18,52],[18,53], [19,1], [19,4], [19,14], [19,17], [20,1], [20,4], [20,14], [20,17],
            [21,1], [21,4], [21,14], [21,17], [22,1], [22,4], [22,14], [22,17],
            [23,1], [23,4], [23,14], [23,17], [23,28], [23,29], [23,30], [23,31],
            [24,4], [24,14], [24,17], [24,28], [24,29], [24,30], [24,31],
            [25,1], [25,4], [25,14], [25,17], [25,28], [25,29], [25,30], [25,31],
            [26,1], [26,4], [26,14], [26,17], [26,28], [26,29], [26,30], [26,31],
            [27,1], [27,4], [27,14], [27,17],[28,1], [28,4], [28,14], [28,17],
            [29,1], [29,4], [29,14], [29,17],[30,1], [30,4], [30,14], [30,17],
            [31,1], [31,4], [32,14], [32,17],[33,1], [33,4], [33,14], [33,17],
            [34,1], [34,4], [34,14], [34,17],[35,1], [35,4], [35,14], [35,17],
            [36,1], [36,4], [36,6], [36,7], [36,8], [36,9], [36,10], [36,11], [36,12], [36,14], [36,17],
            [37,1], [37,4], [37,6],[37,12], [37,14],[37,17],[38,1], [38,4],[38,5], [38,13], [38,14],[38,17],
            [39,1], [39,7], [39,8], [39,9], [39,10], [39,11],[39,17], [40,1], [40,7],[40,11],[40,17],
            [41,1], [41,4], [41,5], [41,6], [41,7], [41,11], [41,12], [41,13],[41,14], [41,17],
            [42,1], [42,4],[42,14],[42,17],
            [43,1], [43,2],[43,3],[43,15],[43,15],[43,16],[43,17],[43,18],[43,19],[43,20],[43,21],
            [43,22],[43,23],[43,24],[43,25],[43,26],[43,27],[43,28],[43,29],[43,30],[43,31],
            [43,32],[43,33],[43,34],[43,35],[43,36],[43,37],[43,38],[43,39],[43,40],[43,41],
            [43,42],[43,43],[43,44]
        ];
        this.blue_px = [[6,31],[6,32],[6,33],[6,34],[6,35],[6,36],[6,37],[6,38],[6,39],[6,40],
            [7,31],[7,40],[8,31],[8,40],[9,31],[9,34],[9,35],[9,36],[9,37],[9,40],[10,31],[10,34],[10,37], [10,40],
            [11,31],[11,34],[11,37],[11,40],[12,31],[12,34],[12,37],[12,40],[13,31],[13,34],[13,37],[13,40],
            [14,31],[14,34],[14,37],[14,40],[15,31],[15,34],[15,37],[15,40],
            [16,31],[16,34],[16,35],[16,36],[16,37],[16,40],[17,31],[17,40],
            [18,24],[18,25],[18,26],[18,27],[18,28],[18,29],[18,30],[18,31],[18,32],[18,33],[18,34],[18,35],
            [18,36],[18,37],[18,38],[18,39],
            [29,42],[29,43],[29,44],[29,46],[29,47],[29,48],[29,49],[29,50],
            [30,42],[30,44],[30,46],[30,51],[31,42],[31,45],[31,46],[31,51],[31,52],[31,53],
            [32,42],[32,47],[32,48],[32,49],[32,50],[32,53],[33,42],[33,47],[33,50],[33,53],
            [34,42],[34,45],[34,46],[34,47],[34,50],[34,53],[35,42],[35,45],[35,50],[35,53],
            [36,42],[36,45],[36,50],[36,53],[37,42],[37,45],[37,50],[37,53],[38,42],[38,45],[38,50],[38,53],
            [39,42],[39,45],[39,50],[39,53],[40,42],[40,45],[40,50],[40,53],
            [41,32],[41,33],[41,34],[41,35],[41,36],[41,37],[41,38],[41,39],[41,40],[41,41],[41,42],[41,45],[41,50],[41,53],
            [42,45],[42,50],[42,53]
        ];

        // this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
        this.debug = true;
        // let debug = false;
    }

    draw_background(context, program_state) {
        let background_transform = Mat4.identity();
        let wall = background_transform.times(Mat4.translation(-10, 47,-20))
            .times(Mat4.scale(60,50,.1));
        this.shapes.cube.draw(context, program_state, wall, this.materials.cloud);
        let floor1 = background_transform.times(Mat4.translation(-11.5, -3, -13))
            .times(Mat4.scale(60,.1,12));
        this.shapes.cube.draw(context, program_state, floor1, this.materials.grass);
        let floor2 = background_transform.times(Mat4.translation(-11.5, -3, 15))
            .times(Mat4.scale(60,.1,14));
        this.shapes.cube.draw(context, program_state, floor2, this.materials.grass);
        let underground = background_transform.times(Mat4.translation(-2, -42,-20))
            .times(Mat4.scale(100,38,.1));
        this.shapes.cube.draw(context, program_state, underground, this.materials.underground);
        let celling = background_transform.times(Mat4.translation(-8,-3.1,0))
            .times(Mat4.scale(100,.1,30));
        this.shapes.cube.draw(context,program_state,celling, this.materials.celling);
    }

    set_materials() {
        this.m_index += 1;
        this.m_index %= 4;
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Lift/Pause", ["m"], () => this.lift ^= 1);
        this.key_triggered_button("Swing", ['n'], () => this.releaseClub());
        this.key_triggered_button("Change Golf Club's material", ['q'], this.set_materials);
        this.key_triggered_button("Speed up", ['g'], () => this.speedUp());
        this.key_triggered_button("Camera on Ball", ['c'], () => this.camera_on_ball = (this.camera_on_ball+1)%3);
        this.key_triggered_button("Scene 2", ['b'], () => this.scene2Cam = !this.scene2Cam);
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

    // Determine if a point (x, y) is in the line between (x1, y1) and (x2, y2)
    onLine(x, y, x1, y1, x2, y2, error = 0.8) {
        // const error = 0.8;
        const slope_diff = (y-y1)*(x2-x1) - (y2-y1)*(x-x1);
        const isOnLine = (slope_diff <= 0) && (Math.abs(slope_diff) <= error);
        // console.log(x, y, x1, y1, x2, y2, isOnLine);
        return isOnLine;
    }
    onLine2(x, y, x1, y1, x2, y2, error = 0.8) {
        // const error = 0.8;
        const slope_diff = (y-y1)*(x2-x1) - (y2-y1)*(x-x1);
        const isOnLine = Math.abs(slope_diff) <= error;
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

    releaseClub(){
        this.release ^= 1;
        this.swing_angle = this.club_angle;
    }

    speedUp() {
        // When the key g is pressed, increase the horizontal velocity by a certain amount
        if (this.hit_plane_count === 6)
            this.golf_ball_velocity.x -= .6;
    }

    draw_ground(context, program_state) {
        // The ground for scene 1
        let ground1_transform = Mat4.translation(-26, -2, 0).times(Mat4.scale(35, 1, 1));
        this.shapes.cube.draw(context, program_state, ground1_transform, this.materials.grass);
        let ground2_transform = Mat4.translation(20,-2,0).times(Mat4.scale(7, 1, 1));
        this.shapes.cube.draw(context, program_state, ground2_transform, this.materials.grass);
        // console.log(ground1_transform.times(vec4(-1,1,1,1)), ground1_transform.times(vec4(1,1,1,1)),
        //             ground1_transform.times(vec4(1,-1,1,1)), ground1_transform.times(vec4(1,1,1,1)),
        //             ground2_transform.times(vec4(-1,1,1,1)), ground2_transform.times(vec4(1,1,1,1)));
        return [ground1_transform, ground2_transform];
    }

    draw_golf_ball(context, program_state){
        // Our lil stationary Golf Ball
        this.shapes.sphere.draw(context, program_state, this.golf_ball_position, this.materials.golf_ball);
    }

    draw_golf_ball_moving(context, program_state, t, platform_transform, dt, swing_angle) {
        // Our lil moving Golf Ball
        if (this.hit_plane_count === 0)
            this.golf_ball_velocity.x = 38 * swing_angle;
        let golf_ball_transform = Mat4.identity();
        golf_ball_transform = this.golf_ball_position.times(Mat4.translation(t*this.golf_ball_velocity.x-(2.5*this.golf_ball_velocity.x), 0, 0)).times(Mat4.rotation(t, 1, -1, 0));
        // const {dx, dy} = this.delta_displacement(dt);
        // this.current_golf_ball_position = Mat4.translation(dx, dy, 0).times(this.current_golf_ball_position).times(Mat4.rotation(dt, -1, -1, 0));
        // Let the ball fall
        if (this.current_golf_ball_position.times(vec4(0,0,0,1))[0] > 10) {
            this.golf_ball_acceleration.y = -9.8;
        }
        // Prevent passing through the second plane
        if (this.current_golf_ball_position.times(vec4(0,0,0,1))[0]+1 >= 13 && this.current_golf_ball_position.times(vec4(0,0,0,1))[1]-1 < -1 && this.hit_plane_count === 0 && this.golf_ball_velocity.x < 16) {
            this.golf_ball_velocity.x = 0;
            this.inHole = true;
        }
        else if(this.golf_ball_velocity.x >= 16){
            console.log("y_distance", platform_transform[1].times(vec4(0,0,0,1))[0]);
            console.log("x_distance", this.golf_ball_position.times(vec4(0,0,0,1))[1]);
            let x_golf_ball = golf_ball_transform.times(vec4(0,0,0,1))[0]
            let y_golf_ball = this.golf_ball_position.times(vec4(0,0,0,1))[1];
            let x_platform2 = platform_transform[1].times(vec4(0,0,0,1))[0];
            if(x_golf_ball > 15 && x_golf_ball < x_platform2+7 && this.golf_ball_velocity.x >= 16){
                this.current_golf_ball_position = this.golf_ball_position.times(Mat4.translation(t*this.golf_ball_velocity.x-(2.5*this.golf_ball_velocity.x), 0, 0));
            }
        }
        if (this.y_distance(platform_transform[0], golf_ball_transform) > 0 || this.x_distance(platform_transform[0], golf_ball_transform) >= 0){
            let delta_t = t-this.initial_fall;
            let gravity = -0.5*9.8*delta_t*delta_t;
            golf_ball_transform = this.golf_ball_position.times(Mat4.translation(t*this.golf_ball_velocity.x-(2.5*this.golf_ball_velocity.x), gravity, 0));
            if(this.inHole)
                this.draw_scene2(context, program_state, dt);
            if (!this.is_stopped) {
                const {dx, dy} = this.delta_displacement(dt);
                this.current_golf_ball_position = Mat4.translation(dx, dy, 0).times(this.current_golf_ball_position).times(Mat4.rotation(dt / 5, 0, 0, 1));
            }
        }
        else{
            this.initial_fall = t;
        }
        // console.log(this.y_distance(platform_transform, golf_ball_transform));
        // this.shapes.sphere.draw(context, program_state, golf_ball_transform, this.materials.golf_ball);
        this.shapes.sphere.draw(context, program_state, this.current_golf_ball_position, this.materials.golf_ball);
        //console.log(golf_ball_transform);
    }

    draw_golf_clubs(context, program_state, angle, materials) {
        this.golf_club_model = Mat4.identity();
        this.golf_club_model = this.golf_club_model.times(Mat4.translation(-36.4, 10, -1))
            .times(Mat4.translation(.2, 10, 0))
            .times(Mat4.rotation(- angle, 0, 0, 1))
            .times(Mat4.translation(-.2, -10, 0))
            .times(Mat4.scale(.2, 10, .2));
        this.shapes.cube.draw(context, program_state, this.golf_club_model, this.materials.golf_stick);
        this.golf_head_model = this.golf_club_model.times(Mat4.translation(0, -1, 4))
            .times(Mat4.scale(2, .1, 5.5));
        if (this.m_index === 0){
            this.shapes.sphere.draw(context, program_state, this.golf_head_model, this.materials.golf_head);
            this.damping = .8995;
        }
        else if (this.m_index == 1) {
            this.shapes.sphere.draw(context, program_state, this.golf_head_model, this.materials.wood);
            this.damping = .899;
        }
        else if (this.m_index == 2) {
            this.shapes.sphere.draw(context, program_state, this.golf_head_model, this.materials.plastic);
            this.damping = .89;
        }
        else if (this.m_index == 3) {
            this.shapes.sphere.draw(context, program_state, this.golf_head_model, this.materials.metal);
            this.damping = .8999;
        }
    }

    pendulum_update(dt, damping) {
        let acceleration = - 9.8 * dt * dt * Math.sin(this.club_angle);
        this.velocity += acceleration;
        this.velocity *= damping;
        this.club_angle += this.velocity;
    }

    swing_golf_club(dt) {
        const max_angle = .5 * Math.PI;
        let angle = dt * Math.PI * .2;
        if (this.club_angle > max_angle) this.reachesMax = 1;
        else if (this.club_angle <= 0) this.reachesMax = 0;

        if (!this.release) {
            if (this.lift) {
                if (this.reachesMax) this.club_angle -= angle;
                else this.club_angle += angle;
            }
        }
        else {
            if ((this.club_angle <= 0) && (!this.is_Hit)) {
                this.is_Hit = 1;
            }

            if (this.is_Hit)
                this.pendulum_update(dt, this.damping);
            else this.pendulum_update(dt, .99995);
        }
        if (this.current_golf_ball_position.times(vec4(0,0,0,1))[1] < 0) this.club_angle = 0;
    }

    draw_flag(context,program_state){
        //Red flag
        let flag_color = hex_color("#FF0000");
        let flag_transform = Mat4.identity();
        flag_transform=flag_transform.times(Mat4.translation(9.5,20.25,0)).times(Mat4.scale(5,3.75,.35)).times(Mat4.rotation(3*Math.PI/2,0,1,0));
        this.shapes.flag.draw(context,program_state,flag_transform,this.materials.flag.override({color: flag_color}))
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

    draw_dominoes(context, program_state, dt) {
        const final_golf_ball_speed = 1; // The speed of the golf ball after it collides with the domino
        const domino_height = this.domino_dimension.y /* * 0.024 */;
        // Button dimension: radius = 1, height = 0.5
        let button_transform = Mat4.translation(-74, -34, 0).times(Mat4.rotation(Math.PI/2, 1, 0, 0));
        // Set the angular speed of the first domino when the ball hits it
        const set_initial_angular_speed = (v = this.golf_ball_velocity.x) => {
            const initial_golf_ball_velocity = v;
            const golf_ball_mass = 0.046, domino_mass = 0.05;
            const domino_energy = 1/2*golf_ball_mass*(initial_golf_ball_velocity**2 - final_golf_ball_speed**2);
            this.initial_angular_speed =  Math.sqrt(6*domino_energy/domino_mass)/domino_height;
            this.dominoes[0].angular_speed = this.initial_angular_speed;
            console.log( this.dominoes[0].angular_speed);
        }

        const falling = (domino) => {
            const angular_acceleration = 3*9.8/2/domino_height*Math.sin(domino.rotation_angle);
            domino.angular_speed = domino.angular_speed + angular_acceleration*dt;
            const delta_angle = domino.angular_speed*dt;
            domino.rotation_angle = (domino.rotation_angle + delta_angle);
            // console.log(domino.rotation_angle);
            const bottom_left_pt = domino.transform.times(vec4(-1,-1,0,1));
            let rotation_transform = Mat4.translation(bottom_left_pt[0], bottom_left_pt[1], bottom_left_pt[2])
                .times(Mat4.rotation(delta_angle, 0, 0, 1))
                .times(Mat4.translation(-bottom_left_pt[0], -bottom_left_pt[1], -bottom_left_pt[2]));
            domino.transform = rotation_transform.times(domino.transform);
            // console.log(domino.transform.times(vec4(0,0,0,1)));
        }

        if (this.dominoes[0].state == "sit still") {
            // Detect if the ball hits the first domino
            const golf_ball_center = this.current_golf_ball_position.times(vec4(0,0,0,1));
            const domino_right_x = this.dominoes[0].center.x + 0.5,
                domino_top_y = this.dominoes[0].center.y + this.domino_dimension.y/2,
                domino_bottom_y = this.dominoes[0].center.y - this.domino_dimension.y/2,
                golf_ball_left_x = golf_ball_center[0]-1, golf_ball_left_y = golf_ball_center[1];
            if (this.onLine(golf_ball_left_x, golf_ball_left_y, domino_right_x, domino_top_y, domino_right_x, domino_bottom_y, 1)) {
                // TODO: change the collision detection to checking x-coor of the ball
                // Let the first domino start to fall
                this.dominoes[0].state = "fall";
                set_initial_angular_speed();
                // Let the golf ball bounce back a little
                console.log(1111);
                this.golf_ball_velocity = {x: final_golf_ball_speed, y: 0};
                this.golf_ball_acceleration = {x: -1, y: 0};
                this.is_bounced = true;
                console.log("hit");
            }
        }
        else if (this.golf_ball_velocity.x <= 0.02) { // After the ball is bounced by the domino
            this.golf_ball_acceleration = {x: 0, y: 0};
            // console.log(2222);
            // console.log(this.dominoes[0].transform.times(vec4(0,0,0,1)));
            this.golf_ball_velocity = {x: 0, y: 0};
            this.is_stopped = true;
        }

        // //////////// Let the domino fall at start for now
        // if (this.dominoes[0].state === "sit still")
        // {
        //     this.dominoes[0].state = "fall";
        //     set_initial_angular_speed(3);
        // }
        // // console.log(3/(this.domino_dimension.y)*Math.sqrt(3*golf_ball_mass*golf_ball_speed/domino_mass));
        // // console.log(this.dominoes[0].angular_speed );
        // // console.log(this.dominoes[0].transform.times(vec4(0,0,0,1)));
        // ////////////

        // Control the motion of the dominoes from left to right
        // for (let i = this.dominoes.length - 2; i >= 0; i--) { // Control the ith domino
        for (let i = 0; i <= this.dominoes.length - 2; i++) {
            let this_domino = this.dominoes[i];
            let next_domino = this.dominoes[i+1];

            switch (this_domino.state) {
                case "sit still": // State 1: has not started to fall
                    break;
                case "fall": // State 2: started to fall and has not collided with the domino to the right
                    // Check collision with the domino to the right
                    const right_tip = this_domino.transform.times(vec4(-1,1,0,1));
                    let error = 0.04;
                    // Check collision
                    if (right_tip[0] <= next_domino.center.x + this.domino_dimension.x/2 + error) { /////
                        // if (false) { ///////////////
                        // Let the next domino start to fall
                        // console.log("dom", i, " collides with dom", i+1);
                        next_domino.state = "fall"; /////////
                        this_domino.state = "collided"; ////////
                        // Set the angular speeds after collision
                        next_domino.angular_speed = this_domino.angular_speed =  this.initial_angular_speed;
                    }
                    else {  // The domino has not contacted with the next one
                        falling(this_domino);
                    }
                    break;
                case "collided": // State 3: collided with the domino to the right and moving together
                    const next_dom_top = next_domino.transform.times(vec4(1,1,0,1)),
                        next_dom_bottom = next_domino.transform.times(vec4(1,-1,0,1)),
                        this_dom_bottom_left = this_domino.transform.times(vec4(-1,-1,0,1));
                    const y = next_dom_top[1] - next_dom_bottom[1],
                        x = next_dom_bottom[0] - next_dom_top[0];
                    const next_dom_rot_angle = Math.atan(x/y);
                    const d = this.domino_distance - 1/Math.cos(next_dom_rot_angle);
                    const this_dom_rot_angle = next_dom_rot_angle + Math.asin(d/this.domino_dimension.y*Math.cos(next_dom_rot_angle));
                    const delta_angle = this_dom_rot_angle - this_domino.rotation_angle;
                    this_domino.rotation_angle = this_dom_rot_angle;
                    const bottom_left_pt = this_domino.transform.times(vec4(-1,-1,0,1));
                    let rotation_transform = Mat4.translation(bottom_left_pt[0], bottom_left_pt[1], bottom_left_pt[2])
                        .times(Mat4.rotation(delta_angle, 0, 0, 1))
                        .times(Mat4.translation(-bottom_left_pt[0], -bottom_left_pt[1], -bottom_left_pt[2]));
                    this_domino.transform = rotation_transform.times(this_domino.transform);
                    break;
            }
        }
        // The motion of the right most domino
        let this_domino = this.dominoes[7];
        switch (this_domino.state) {
            case "sit still": break;
            case "fall":
                // Check collision with the button
                const btn_center = button_transform.times(vec4(0,0,0,1)),
                    domino_upper_left = this_domino.transform.times(vec4(-1,1,0,1)),
                    domino_bottom_left = this_domino.transform.times(vec4(-1,-1,0,1));
                const btn_top_right_x = btn_center[0] + 1,
                    btn_top_right_y = btn_center[1] + 0.5,
                    domino_upper_left_x = domino_upper_left[0], domino_upper_left_y = domino_upper_left[1],
                    domino_bottom_left_x = domino_bottom_left[0], domino_bottom_left_y = domino_bottom_left[1]
                // if (this.onLine(btn_top_right_x, btn_top_right_y,
                //     domino_upper_left_x, domino_upper_left_y, domino_bottom_left_x, domino_bottom_left_y, 1.3)) {
                if (this.onLine2(btn_top_right_x, btn_top_right_y,
                    domino_upper_left_x, domino_upper_left_y, domino_bottom_left_x, domino_bottom_left_y, 1.3)) {
                    // The domino collided with the button
                    this_domino.state = "collided";
                    console.log(btn_top_right_x, btn_top_right_y, domino_upper_left, domino_bottom_left);
                    console.log("onLine");
                }
                else {  // The domino falls
                    // console.log("fall");
                    falling(this_domino);
                }
                break;
            case "collided":
                this.you_win = true;
                break;
        }
        // this.shapes.axis.draw(context, program_state, /*Mat4.translation(0,.5,0).times*/(button_transform), this.materials.test.override({color: hex_color("#ffff00")}));
        // button_transform = button_transform.times(Mat4.scale(1,.5,1));
        let button_base_transform = Mat4.translation(-74, -34-0.5, 0).times(Mat4.scale(1.2,0.5,1));
        if (this.debug) {
            const pt = button_transform.times(vec4(0,0,0,1));
            console.log(pt);
            this.debug = false;
        }
        // Draw the dominoes
        for (let idx in this.dominoes) {
            this.shapes.cube.draw(context, program_state, this.dominoes[idx].transform, this.materials.test4.override({color: hex_color("#0099ff")}));
            // console.log("domino")
        }
        // Draw the button and the button base
        this.shapes.pole_base.draw(context, program_state, button_transform, this.materials.test4.override({color: hex_color("#9370db")}));
        this.shapes.cube.draw(context, program_state, button_base_transform, this.materials.test4.override({color: hex_color("#b2b2b2")}));
    }

    draw_you_win(context, program_state, t) {
        if (!this.you_win) {return;}
        // if (t % 3 < 1) {return;}
        const loc = [-140, 10];
        const box_transform = Mat4.scale(0.5,0.5,0.5);
        const draw_px = (arr, pxcolor) => {
            arr.map((px) => {
                const x = loc[0]+px[1], y = loc[1]-px[0];
                this.shapes.cube.draw(context, program_state, Mat4.translation(x, y, 0).times(box_transform), this.materials.test4.override({color: pxcolor}));
            });
        }
        draw_px(this.blue_px, hex_color("#2bd8ff"));
        draw_px(this.red_px, hex_color("#ff2727"));
        draw_px(this.yellow_px, hex_color("#ffd539"));
        let desired = Mat4.translation(100, 15, -70);
        program_state.set_camera(desired.map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
    }

    draw_splash(context, program_state, t){
        if(!this.splash){
            this.splash = true;
            this.splashx = this.current_golf_ball_position.times(vec4(0, 0, 0, 1))[0];
            this.splashy = this.current_golf_ball_position.times(vec4(0, 0, 0, 1))[1];
            this.initial_splash = t;
        }
        else{
            console.log("size", 0.7-t+this.initial_splash);
            let splash_size = 0.7-t+this.initial_splash;
            let reverse_splash_size = 0.7+t-this.initial_splash;
            let splash1 = Mat4.translation(this.splashx-1, this.splashy+t-this.initial_splash-0.5, 0).times(Mat4.scale(splash_size+1, splash_size, 0.7));
            let splash2 = Mat4.translation(this.splashx+1, this.splashy+t-this.initial_splash-0.5, 0).times(Mat4.scale(splash_size+1, splash_size, 0.7));
            if(splash_size < -1.3){
                splash1 = Mat4.translation(this.splashx-1, this.splashy+t-this.initial_splash-0.5, 0).times(Mat4.scale(0, 0, 0));
                splash2 = Mat4.translation(this.splashx+1, this.splashy+t-this.initial_splash-0.5, 0).times(Mat4.scale(0, 0, 0));
            }
            this.shapes.sphere.draw(context, program_state, splash1, this.materials.test3.override({color: hex_color("#88ccff")}));
            this.shapes.sphere.draw(context, program_state, splash2, this.materials.test3.override({color: hex_color("#88ccff")}));
        }
    }

    draw_game_over(context, program_state, t, tank_center_loc = [0, -70, 0]) {
        // The game over scene
        let tank_transform = Mat4.translation(tank_center_loc[0], tank_center_loc[1], tank_center_loc[2]).times(Mat4.scale(250,10,1));
        let gg_transform = Mat4.translation(this.current_golf_ball_position.times(vec4(0, 0, 0, 1))[0], tank_center_loc[1], tank_center_loc[2]+1);
        this.shapes.text.set_string("GAME OVER", context.context);
        // Modeling a falling golf ball
        let golf_ball_transform = Mat4.translation(tank_center_loc[0]-5, tank_center_loc[1]+20, tank_center_loc[2]);
        // golf_ball_transform = this.projectile_transform(5, this.launch_time, program_state.animation_time / 1000, golf_ball_transform);
        golf_ball_transform = this.current_golf_ball_position;
        // let cube2_transform = Mat4.translation(-50,-30,0);
        // let cube3_transform = Mat4.translation(-55, -20, 0);
        // let cube4_initial_pos = vec4(-45, -10.5, 0.5);

        let water_lv = tank_transform.times(vec4(0,1,0,1))[1],
            tank_bottom = tank_transform.times(vec4(0,-1,0,1))[1];
        let golf_ball_center = golf_ball_transform.times(vec4(0,0,0,1)),
            golf_ball_center_x = golf_ball_center[0],
            golf_ball_center_y = golf_ball_center[1],
            golf_ball_center_z = golf_ball_center[2],
            golf_ball_bottom_y = golf_ball_center_y - 1;
        let is_show_text = (golf_ball_center_y <= water_lv);
        let h = water_lv - golf_ball_bottom_y;
        // is_show_text = true;
        if (is_show_text) {
            // this.shapes.text.draw(context, program_state, gg_transform, this.text_image);
            this.draw_splash(context, program_state, t);
            let gg_plane_transform = Mat4.scale(25,10,0.005);
            gg_plane_transform = gg_transform.times(gg_plane_transform);
            this.shapes.cube.draw(context, program_state, gg_plane_transform, this.materials.gg);
        }
        // Modeling buoyancy
        if (h >= 0 && h < 19.8) {
            this.set_immersed_acceleration(water_lv - golf_ball_center_y);
        }
        else if (h >= 19.8) {
            this.golf_ball_velocity = {x: 0, y: 0};
            this.golf_ball_acceleration = {x: 0, y: 0};
            // this.current_golf_ball_position = Mat4.translation(golf_ball_center_x, golf_ball_center_y, golf_ball_center_z);
            this.is_stopped = true;
            // Drag the golf ball to the tank bottom
            this.current_golf_ball_position = Mat4.translation(0,tank_bottom - golf_ball_bottom_y, 0).times(this.current_golf_ball_position);
        }

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

    // TODO: drag the golf ball up to the scene 2 platform
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

        // this.shapes.sphere.draw(context, program_state, this.current_golf_ball_position, this.materials.golf_ball);

        // Draw the platform
        const ground_transform = Mat4.translation(-52, -36, 0).times(Mat4.scale(28, 1, 1));
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

    set_immersed_acceleration(h) {
        /*   buoyant force = water density * g * immersed volume
             immersed volume of a sphere = pi(R*h^2 - h^3/3), where h is the immersed height
         */
        // console.log(h);
        if (h >= 2) {h = 2;}

        const g = 9.8, water_density = 2000, radius = 0.024, mass = 0.046;  // The actual water density is 997 kg/m^3 but for the let's choose a denser water
        const h_real = radius/1 * h;
        const immersed_volume = Math.PI*(radius*h_real*h_real - h_real**3/3);
        const buoyancy = water_density*g*immersed_volume;
        const acc = buoyancy / mass - g;
        this.golf_ball_acceleration.y = acc;
        console.log(h, acc);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            // program_state.set_camera(this.initial_camera_location);
            program_state.set_camera(Mat4.translation(10, -10, -60));
            // program_state.set_camera(Mat4.translation(0, 10, -100));
            // program_state.set_camera(Mat4.translation(10, 40, -100)); // focus on the game over scene
            // program_state.set_camera(Mat4.translation(55, 30, -28)); // focus on the dominoes
            // program_state.set_camera(Mat4.translation(40, 30, -9)); // focus on the dominoes
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // this.shapes.[XXX].draw([XXX]) // <--example

        const light_position = vec4(0, 5, 5, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000),
            // new Light(vec4(0, -5, 15, 1), color(1,1,1,1), 1000)
        ];

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        const yellow = hex_color("#fac91a");
        let model_transform = Mat4.identity();

        // this.shapes.cube.draw(context, program_state, Mat4.translation(13,0,0), this.materials.test);

        let gravity = -0.5*9.8*t*t;

        // Draw the ground of scene 1

        const ground_transform = this.draw_ground(context, program_state);
        this.draw_background(context, program_state);

        this.swing_golf_club(dt);
        this.draw_golf_clubs(context, program_state, this.club_angle, this.m_index);

        if (!this.is_Hit) {
            this.draw_golf_ball(context, program_state);
            this.hit_time = t;
        }
        else {
            this.draw_golf_ball_moving(context,
                program_state, t-this.hit_time+2.5, ground_transform, dt, this.swing_angle);
        }


        //this.draw_golf_ball(context, program_state);
        // if (t < 2.5) {
        //     this.draw_golf_ball(context, program_state);
        // }
        // else if(t < 13){
        //     this.current_golf_ball_position = this.draw_golf_ball_moving(context, program_state, t, ground1_transform);
        // }


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
        // if (t > 13) {
        //     this.draw_scene2(context, program_state, dt, this.current_golf_ball_position);
        // }
        let position_of_golf_ball = this.current_golf_ball_position.times(vec4(0, 0, 0, 1));
        let x = position_of_golf_ball[0];
        let y = position_of_golf_ball[1]
        if(this.camera_on_ball === 1){
            let desired = Mat4.translation(-x, -y, -10);
            program_state.set_camera(desired.map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
        }
        else if(this.camera_on_ball === 2){
            let desired = Mat4.translation(-x, -y-6, -45);
            program_state.set_camera(desired.map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
        }
        if (this.scene2Cam){
            let desired = Mat4.translation(10, 20, -60);
            program_state.set_camera(desired.map((x, i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
        }

        // Draw the game over scene
        this.draw_game_over(context, program_state, t);

        this.draw_dominoes(context, program_state, dt);
        // this.you_win = true;//////////
        this.draw_you_win(context, program_state, t);

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

class Ring_Shader extends Shader {

    send_material(gl, gpu, material) {  // From the codes above
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));

        this.send_material(context, gpu_addresses, material);
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        uniform vec4 shape_color; 
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
          gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
          gl_FragColor = vec4(shape_color.xyz, 0.8);
        }`;
    }
}